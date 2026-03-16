/**
 * 外部平台集成路由
 * 提供外部平台数据同步、组织架构导入、表单数据迁移等功能
 */

import { z } from "zod";
import { jsonValue } from "../../shared/validators";
import {router, protectedProcedure, adminProcedure, requirePermission} from "../_core/trpc";
import { getExternalSyncService, getExternalSyncUserService } from "../external-sync";
import { getExternalSyncScheduler } from "../services/external-sync-scheduler.service";
import { getPermissionMappingService, GRT_ROLES, GRT_PERMISSIONS } from "../services/permission-mapping.service";
import { getExtSyncFullImportService, type ImportPhase } from "../services/ext-sync-full-import.service";
import { getExtSyncFormDiscoveryService } from "../services/ext-sync-form-discovery.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("external-sync-router");
import { requireDb } from "../db";
import { sql as drizzleSql } from "drizzle-orm";

export const externalSyncRouter = router({
  /**
   * 获取配置状态
   */
  getStatus: protectedProcedure.query(async () => {
    const service = getExternalSyncService();
    return {
      configured: service.isConfigured(),
      corpId: service.getCorpId(),
      stats: service.getStats(),
    };
  }),

  /**
   * 测试API连接
   */
  testConnection: requirePermission('system:data:migrate').mutation(async () => {
    const service = getExternalSyncService();
    if (!service.isConfigured()) {
      const db = await requireDb();
      const [deptCount, userCount, roleCount] = await Promise.all([
        db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_dept_mappings`),
        db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_user_mappings`),
        db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_role_mappings`),
      ]);
      return {
        success: true,
        mode: 'local',
        message: '本地模式 — 使用已同步的本地数据',
        localStats: {
          departments: Number((deptCount as any)[0]?.[0]?.cnt || 0),
          users: Number((userCount as any)[0]?.[0]?.cnt || 0),
          roles: Number((roleCount as any)[0]?.[0]?.cnt || 0),
        },
      };
    }
    return service.testConnection();
  }),

  /**
   * 获取应用列表
   */
  getApps: protectedProcedure.query(async () => {
    const db = await requireDb();
    const result = await db.execute(
      drizzleSql`SELECT DISTINCT jdy_app_id as app_id, jdy_app_name as app_name
                 FROM jiandaoyun_form_mappings ORDER BY jdy_app_name LIMIT 500`
    );
    const rows = (result as any)[0] || [];
    return { apps: rows, error: null, source: 'local' };
  }),

  /**
   * 获取指定应用的表单列表
   */
  getForms: protectedProcedure
    .input(z.object({ appId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(
        drizzleSql`SELECT * FROM jiandaoyun_form_mappings
                   WHERE jdy_app_id = ${input.appId} ORDER BY jdy_form_name LIMIT 500`
      );
      const rows = (result as any)[0] || [];
      return { forms: rows, error: null, source: 'local' };
    }),

  /**
   * 获取表单字段结构
   */
  getFormFields: protectedProcedure
    .input(z.object({ appId: z.string(), formId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(
        drizzleSql`SELECT field_schema FROM jiandaoyun_form_mappings
                   WHERE jdy_app_id = ${input.appId} AND jdy_form_id = ${input.formId} LIMIT 1`
      );
      const row = (result as any)[0]?.[0];
      const fields = row?.field_schema || [];
      return { fields: Array.isArray(fields) ? fields : (typeof fields === 'string' ? JSON.parse(fields) : []), error: null, source: 'local' };
    }),

  /**
   * 获取表单数据
   */
  getFormData: protectedProcedure
    .input(z.object({
      appId: z.string(),
      formId: z.string(),
      limit: z.number().min(1).max(100).optional().default(50),
      dataId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(
        drizzleSql`SELECT record_data, jdy_record_id, ext_creator, ext_created_at, ext_updated_at, synced_at
                   FROM jiandaoyun_form_data_cache
                   WHERE jdy_app_id = ${input.appId} AND jdy_form_id = ${input.formId}
                   ORDER BY id DESC LIMIT ${input.limit}`
      );
      const rows = (result as any)[0] || [];
      return {
        data: rows.map((r: any) => ({
          ...(typeof r.record_data === 'string' ? JSON.parse(r.record_data) : r.record_data),
          _id: r.jdy_record_id,
          _synced_at: r.synced_at,
        })),
        error: null,
        source: 'local',
      };
    }),

  /**
   * 获取表单数据统计
   */
  getFormStats: protectedProcedure
    .input(z.object({ appId: z.string(), formId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(
        drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_form_data_cache
                   WHERE jdy_app_id = ${input.appId} AND jdy_form_id = ${input.formId}`
      );
      return { count: Number((result as any)[0]?.[0]?.cnt || 0), error: null, source: 'local' };
    }),

  /**
   * 获取部门列表
   */
  getDepartments: protectedProcedure
    .input(z.object({ deptNo: z.number().optional().default(1) }))
    .query(async () => {
      const db = await requireDb();
      const result = await db.execute(
        drizzleSql`SELECT * FROM jiandaoyun_dept_mappings ORDER BY jdy_dept_name LIMIT 1000`
      );
      const rows = (result as any)[0] || [];
      return {
        departments: rows.map((r: any) => ({
          dept_no: Number(r.jdy_dept_no || r.id),
          name: r.jdy_dept_name,
          parent_no: r.jdy_parent_no ? Number(r.jdy_parent_no) : null,
          type: r.jdy_dept_type,
          status: r.jdy_dept_status,
        })),
        error: null,
        source: 'local',
      };
    }),

  /**
   * 获取成员列表
   */
  getMembers: protectedProcedure
    .input(z.object({ deptNo: z.number().optional().default(1) }))
    .query(async () => {
      const db = await requireDb();
      const result = await db.execute(
        drizzleSql`SELECT * FROM jiandaoyun_user_mappings ORDER BY jdy_name LIMIT 5000`
      );
      const rows = (result as any)[0] || [];
      return {
        members: rows.map((r: any) => ({
          username: r.jdy_username,
          name: r.jdy_name,
          departments: r.jdy_departments,
          status: Number(r.jdy_status || 1),
          integrate_id: r.jdy_integrate_id,
        })),
        error: null,
        source: 'local',
      };
    }),

  /**
   * 获取角色列表
   */
  getRoles: protectedProcedure.query(async () => {
    const db = await requireDb();
    const result = await db.execute(
      drizzleSql`SELECT * FROM jiandaoyun_role_mappings ORDER BY jdy_role_name LIMIT 500`
    );
    const rows = (result as any)[0] || [];
    return {
      roles: rows.map((r: any) => ({
        role_no: Number(r.jdy_role_no || r.id),
        group_no: Number(r.jdy_group_no || 0),
        name: r.jdy_role_name,
        type: r.jdy_role_type,
        status: r.jdy_role_status,
      })),
      error: null,
      source: 'local',
    };
  }),

  /**
   * 执行全量同步
   */
  fullSync: adminProcedure.mutation(async () => {
    const service = getExternalSyncService();
    if (!service.isConfigured()) {
      return { success: false, error: "外部平台API未配置" };
    }
    try {
      const result = await service.fullSync();
      return {
        success: true,
        apps: result.apps.length,
        totalRecords: result.totalRecords,
        formCounts: result.formCounts,
        error: null,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }),

  // ===== 用户同步路由 =====

  /**
   * 同步外部平台成员到用户映射表
   */
  syncMembers: adminProcedure.mutation(async () => {
    const userSyncService = getExternalSyncUserService();
    try {
      const result = await userSyncService.syncMembers();
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }),

  /**
   * 同步外部平台部门到部门映射表
   */
  syncDepartments: adminProcedure.mutation(async () => {
    const userSyncService = getExternalSyncUserService();
    try {
      const result = await userSyncService.syncDepartments();
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }),

  /**
   * 同步外部平台角色到角色映射表
   */
  syncRoles: adminProcedure.mutation(async () => {
    const userSyncService = getExternalSyncUserService();
    try {
      const result = await userSyncService.syncRoles();
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }),

  /**
   * 获取用户映射列表
   */
  getUserMappings: protectedProcedure.query(async () => {
    const userSyncService = getExternalSyncUserService();
    try {
      const mappings = await userSyncService.getUserMappings();
      return { mappings, error: null };
    } catch (error: any) {
      return { mappings: [], error: error.message };
    }
  }),

  /**
   * 获取部门映射列表
   */
  getDeptMappings: protectedProcedure.query(async () => {
    const userSyncService = getExternalSyncUserService();
    try {
      const mappings = await userSyncService.getDeptMappings();
      return { mappings, error: null };
    } catch (error: any) {
      return { mappings: [], error: error.message };
    }
  }),

  /**
   * 获取角色映射列表
   */
  getRoleMappings: protectedProcedure.query(async () => {
    const userSyncService = getExternalSyncUserService();
    try {
      const mappings = await userSyncService.getRoleMappings();
      return { mappings, error: null };
    } catch (error: any) {
      return { mappings: [], error: error.message };
    }
  }),

  /**
   * 关联外部平台用户与GRT用户
   */
  linkUserToGrt: adminProcedure
    .input(z.object({
      extUsername: z.string(),
      grtUserId: z.number(),
      grtOpenId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const userSyncService = getExternalSyncUserService();
      try {
        const success = await userSyncService.linkUserToGrt(
          input.extUsername,
          input.grtUserId,
          input.grtOpenId
        );
        return { success };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),

  /**
   * 关联外部平台角色与GRT权限角色
   */
  linkRoleToGrt: adminProcedure
    .input(z.object({
      extRoleNo: z.number(),
      grtRoleId: z.string(),
      grtRoleName: z.string(),
      permissionMapping: z.record(z.string(), jsonValue).optional(),
    }))
    .mutation(async ({ input }) => {
      const userSyncService = getExternalSyncUserService();
      try {
        const success = await userSyncService.linkRoleToGrt(
          input.extRoleNo,
          input.grtRoleId,
          input.grtRoleName,
          input.permissionMapping
        );
        return { success };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),

  /**
   * 同步外部平台角色成员
   */
  syncRoleMembers: adminProcedure.mutation(async () => {
    const userSyncService = getExternalSyncUserService();
    try {
      const result = await userSyncService.syncRoleMembers();
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }),

  /**
   * 获取角色成员映射列表
   */
  getRoleMemberMappings: protectedProcedure
    .input(z.object({ roleNo: z.number().optional() }))
    .query(async ({ input }) => {
      const userSyncService = getExternalSyncUserService();
      try {
        const mappings = await userSyncService.getRoleMemberMappings(input.roleNo);
        return { mappings, error: null };
      } catch (error: any) {
        return { mappings: [], error: error.message };
      }
    }),

  /**
   * 实时获取角色成员（直接调用API）
   */
  getRoleMembersLive: protectedProcedure
    .input(z.object({ roleNo: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(
        drizzleSql`SELECT * FROM jiandaoyun_role_members
                   WHERE jdy_role_no = ${input.roleNo} LIMIT 1000`
      );
      const rows = (result as any)[0] || [];
      return {
        members: rows.map((r: any) => ({
          username: r.jdy_username,
          name: r.jdy_name,
          departments_range: r.jdy_departments_range,
          has_child: r.jdy_has_child,
        })),
        error: null,
        source: 'local',
      };
    }),

  // ===== 定时同步任务路由 =====

  /**
   * 获取所有同步任务
   */
  getSyncTasks: protectedProcedure.query(async () => {
    const scheduler = getExternalSyncScheduler();
    try {
      const tasks = await scheduler.getTasks();
      return { tasks, error: null };
    } catch (error: any) {
      return { tasks: [], error: error.message };
    }
  }),

  /**
   * 创建同步任务
   */
  createSyncTask: adminProcedure
    .input(z.object({
      taskName: z.string(),
      taskType: z.enum(['user', 'department', 'role', 'role_members', 'form_data', 'full']),
      extAppId: z.string().optional(),
      extFormId: z.string().optional(),
      syncDirection: z.enum(['external_to_grt', 'grt_to_external', 'bidirectional']),
      fieldMapping: z.record(z.string(), z.string()).optional(),
      filterCondition: z.record(z.string(), jsonValue).optional(),
      cronExpression: z.string().optional(),
      isEnabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const scheduler = getExternalSyncScheduler();
      try {
        const taskId = await scheduler.createTask(input as any);
        return { success: true, taskId };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),

  /**
   * 更新任务状态
   */
  updateTaskStatus: adminProcedure
    .input(z.object({
      taskId: z.number(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const scheduler = getExternalSyncScheduler();
      try {
        await scheduler.updateTaskStatus(input.taskId, input.enabled);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),

  /**
   * 删除同步任务
   */
  deleteSyncTask: adminProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input }) => {
      const scheduler = getExternalSyncScheduler();
      try {
        await scheduler.deleteTask(input.taskId);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),

  /**
   * 执行同步任务
   */
  executeSyncTask: adminProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const scheduler = getExternalSyncScheduler();
      try {
        const result = await scheduler.executeTask(input.taskId, 'manual', ctx.user?.id);
        return { success: result.status !== 'failed', ...result };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),

  /**
   * 获取任务执行日志
   */
  getSyncLogs: protectedProcedure
    .input(z.object({
      taskId: z.number().optional(),
      limit: z.number().min(1).max(200).optional().default(50),
    }))
    .query(async ({ input }) => {
      const scheduler = getExternalSyncScheduler();
      try {
        const logs = await scheduler.getTaskLogs(input.taskId, input.limit);
        return { logs, error: null };
      } catch (error: any) {
        return { logs: [], error: error.message };
      }
    }),

  /**
   * 获取同步统计
   */
  getSyncStats: protectedProcedure.query(async () => {
    const scheduler = getExternalSyncScheduler();
    try {
      const stats = await scheduler.getStats();
      return { stats, error: null };
    } catch (error: any) {
      return { stats: null, error: error.message };
    }
  }),

  /**
   * 创建默认同步任务
   */
  createDefaultTasks: adminProcedure.mutation(async () => {
    const scheduler = getExternalSyncScheduler();
    try {
      const taskIds = await scheduler.createDefaultTasks();
      return { success: true, taskIds };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }),

  // ===== 权限映射路由 =====

  /**
   * 获取GRT角色列表
   */
  getGrtRoles: protectedProcedure.query(async () => {
    const roles = Object.values(GRT_ROLES).map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissionCount: role.permissions.length,
    }));
    return { roles };
  }),

  /**
   * 获取GRT权限列表
   */
  getGrtPermissions: protectedProcedure.query(async () => {
    const permissions = Object.entries(GRT_PERMISSIONS).map(([key, value]) => ({
      key,
      value,
      category: value.split(':')[0],
      action: value.split(':')[1],
    }));
    return { permissions };
  }),

  /**
   * 获取角色的权限列表
   */
  getRolePermissions: protectedProcedure
    .input(z.object({ roleId: z.string() }))
    .query(async ({ input }) => {
      const permissionService = getPermissionMappingService();
      const permissions = permissionService.getRolePermissions(input.roleId);
      return { permissions };
    }),

  /**
   * 获取用户的所有权限
   */
  getUserPermissions: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const permissionService = getPermissionMappingService();
      try {
        const permissions = await permissionService.getUserPermissions(input.userId);
        return { permissions, error: null };
      } catch (error: any) {
        return { permissions: [], error: error.message };
      }
    }),

  /**
   * 检查用户是否有指定权限
   */
  checkUserPermission: protectedProcedure
    .input(z.object({
      userId: z.number(),
      permission: z.string(),
    }))
    .query(async ({ input }) => {
      const permissionService = getPermissionMappingService();
      try {
        const hasPermission = await permissionService.checkUserPermission(input.userId, input.permission);
        return { hasPermission, error: null };
      } catch (error: any) {
        return { hasPermission: false, error: error.message };
      }
    }),

  /**
   * 自动映射外部平台角色到GRT角色
   */
  autoMapRoles: adminProcedure.mutation(async () => {
    const permissionService = getPermissionMappingService();
    try {
      const result = await permissionService.autoMapRoles();
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }),

  /**
   * 获取角色映射统计
   */
  getMappingStats: protectedProcedure.query(async () => {
    const permissionService = getPermissionMappingService();
    try {
      const stats = await permissionService.getMappingStats();
      return { stats, error: null };
    } catch (error: any) {
      return { stats: null, error: error.message };
    }
  }),

  /**
   * 获取建议GRT角色
   */
  suggestGrtRole: protectedProcedure
    .input(z.object({ extRoleName: z.string() }))
    .query(async ({ input }) => {
      const permissionService = getPermissionMappingService();
      const suggestedRoleId = permissionService.suggestGrtRole(input.extRoleName);
      const role = Object.values(GRT_ROLES).find(r => r.id === suggestedRoleId);
      return {
        suggestedRoleId,
        suggestedRoleName: role?.name || '',
        suggestedPermissions: role?.permissions || [],
      };
    }),

  /**
   * 获取按事业部分组的人员名单
   * 返回按BU分组的人员信息，用于展示各事业部的团队结构
   */
  getMembersByBU: protectedProcedure.query(async () => {
    try {
      const db = await requireDb();
      const [deptResult, memberResult] = await Promise.all([
        db.execute(drizzleSql`SELECT jdy_dept_no, jdy_dept_name FROM jiandaoyun_dept_mappings LIMIT 1000`),
        db.execute(drizzleSql`SELECT jdy_username, jdy_name, jdy_departments, jdy_status FROM jiandaoyun_user_mappings LIMIT 5000`),
      ]);
      const departments = ((deptResult as any)[0] || []).map((r: any) => ({
        dept_no: Number(r.jdy_dept_no || 0),
        name: r.jdy_dept_name || '',
      }));
      const allMembers = ((memberResult as any)[0] || []).map((r: any) => ({
        username: r.jdy_username || '',
        name: r.jdy_name || '',
        departments: r.jdy_departments,
        status: Number(r.jdy_status || 1),
      }));

      // BU keyword mapping (keep same logic)
      const buKeywords: Record<string, string[]> = {
        'BU1': ['海外', 'overseas', 'international'],
        'BU2': ['商用车', '商用', 'commercial'],
        'BU3': ['乘用车', '乘用', 'passenger'],
        'BU4': ['半导体', 'semiconductor', '芯片'],
        'BU5': ['工业通用', '通用', 'general', 'industrial'],
      };

      const buNames: Record<string, string> = {
        'BU1': 'BU1 - 海外事业部',
        'BU2': 'BU2 - 商用车事业部',
        'BU3': 'BU3 - 乘用车事业部',
        'BU4': 'BU4 - 半导体事业部',
        'BU5': 'BU5 - 工业通用事业部',
      };

      const buMembers: Array<{
        buCode: string;
        buName: string;
        departments: Array<{
          deptNo: number;
          deptName: string;
          members: Array<{ username: string; name: string; status: number; email?: string; phone?: string }>;
        }>;
        totalMembers: number;
      }> = [];

      for (const [buCode, keywords] of Object.entries(buKeywords)) {
        const matchedDepts = departments.filter((dept: any) =>
          keywords.some(kw => dept.name.toLowerCase().includes(kw.toLowerCase()))
        );

        const deptData = matchedDepts.map((dept: any) => {
          const deptMembers = allMembers.filter((m: any) => {
            const depts = m.departments;
            if (Array.isArray(depts)) return depts.includes(dept.dept_no);
            if (typeof depts === 'string') {
              try { return JSON.parse(depts).includes(dept.dept_no); } catch { return false; }
            }
            return false;
          });
          return {
            deptNo: dept.dept_no,
            deptName: dept.name,
            members: deptMembers.map((m: any) => ({
              username: m.username,
              name: m.name,
              status: m.status,
            })),
          };
        });

        const totalMembers = deptData.reduce((sum: number, d: any) => sum + d.members.length, 0);
        buMembers.push({
          buCode,
          buName: buNames[buCode] || buCode,
          departments: deptData,
          totalMembers,
        });
      }

      return { buMembers, error: null, source: 'local' };
    } catch (error: any) {
      return { buMembers: [], error: error.message };
    }
  }),

  // ===== 全量导入功能 =====

  /**
   * 启动全量导入
   */
  startFullImport: adminProcedure
    .input(z.object({
      phases: z.array(z.enum(['org', 'user', 'discovery', 'project', 'approval', 'knowledge', 'form_data_cache'])).min(1),
      dryRun: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const service = getExtSyncFullImportService();
      if (service.isRunning()) {
        throw new Error('已有导入任务正在运行');
      }
      const runCode = await service.startImport({
        phases: input.phases as ImportPhase[],
        dryRun: input.dryRun,
      });
      return { runCode };
    }),

  /**
   * 获取导入进度
   */
  getImportProgress: protectedProcedure
    .input(z.object({ runCode: z.string() }))
    .query(async ({ input }) => {
      const service = getExtSyncFullImportService();
      const progress = await service.getProgress(input.runCode);
      if (!progress) {
        throw new Error(`导入运行 ${input.runCode} 未找到`);
      }
      return progress;
    }),

  /**
   * 列出所有导入记录
   */
  getImportRuns: protectedProcedure
    .query(async () => {
      const service = getExtSyncFullImportService();
      return service.getImportRuns();
    }),

  /**
   * 取消导入
   */
  cancelImport: adminProcedure
    .mutation(async () => {
      const service = getExtSyncFullImportService();
      const cancelled = service.requestCancel();
      return { cancelled };
    }),

  /**
   * 检查是否有正在运行的导入
   */
  isImportRunning: protectedProcedure
    .query(async () => {
      const service = getExtSyncFullImportService();
      return { running: service.isRunning() };
    }),

  /**
   * 执行表单发现 — 非阻塞，立即返回，后台扫描
   * 前端轮询 getFormMappings 获取增量结果
   */
  discoverForms: adminProcedure
    .mutation(async () => {
      const service = getExtSyncFormDiscoveryService();
      // Fire-and-forget: discovery saves forms incrementally to DB
      service.discoverForms().catch((err) => {
        log.error({ err }, "Background form discovery failed");
      });
      return { started: true, message: "表单发现已启动，正在后台扫描..." };
    }),

  /**
   * 将外部平台表单数据同步到本地缓存（需外部API配置）
   */
  syncFormDataToCache: adminProcedure
    .input(z.object({ appId: z.string(), formId: z.string() }))
    .mutation(async ({ input }) => {
      const service = getExtSyncFormDiscoveryService();
      return service.cacheFormData(input.appId, input.formId);
    }),

  /**
   * 获取发现的表单映射
   */
  getFormMappings: protectedProcedure
    .input(z.object({
      targetEntity: z.string().optional(),
      confirmedOnly: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const service = getExtSyncFormDiscoveryService();
      if (input?.confirmedOnly) {
        return service.getConfirmedMappings(input?.targetEntity);
      }
      return service.getFormMappings(input?.targetEntity);
    }),

  /**
   * 更新/确认表单映射
   */
  updateFormMapping: adminProcedure
    .input(z.object({
      id: z.number(),
      targetEntity: z.string().optional(),
      fieldMapping: z.record(z.string(), z.string()).optional(),
      isConfirmed: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const service = getExtSyncFormDiscoveryService();
      const { id, ...updates } = input;
      return service.updateFormMapping(id, updates);
    }),

  /**
   * 获取导入验证结果
   */
  getImportVerification: protectedProcedure
    .query(async () => {
      const service = getExtSyncFullImportService();
      return service.getVerification();
    }),

  // ===== 审批流程查看器端点 =====

  /**
   * 获取审批模板列表 + 实例计数
   */
  getApprovalTemplates: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      const result = await db.execute(
        drizzleSql`SELECT t.*,
          (SELECT COUNT(*) FROM grt_approval_instances i WHERE i.template_id = t.id) as instance_count
        FROM grt_approval_templates t
        ORDER BY t.created_at DESC`
      );
      const rows = (result as any)[0] || [];
      return rows.map((r: any) => ({
        ...r,
        steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : (r.steps || []),
        instance_count: Number(r.instance_count || 0),
      }));
    }),

  /**
   * 获取审批实例列表（支持按模板/状态筛选）
   */
  getApprovalInstances: protectedProcedure
    .input(z.object({
      templateId: z.number().optional(),
      status: z.string().optional(),
      limit: z.number().min(1).max(200).optional().default(50),
      offset: z.number().optional().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const templateId = input?.templateId;
      const status = input?.status;
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;

      let query = drizzleSql`SELECT * FROM grt_approval_instances WHERE 1=1`;
      if (templateId) {
        query = drizzleSql`SELECT * FROM grt_approval_instances WHERE template_id = ${templateId}`;
        if (status) {
          query = drizzleSql`SELECT * FROM grt_approval_instances WHERE template_id = ${templateId} AND status = ${status}`;
        }
      } else if (status) {
        query = drizzleSql`SELECT * FROM grt_approval_instances WHERE status = ${status}`;
      }

      // Count query
      let countQuery = drizzleSql`SELECT COUNT(*) as cnt FROM grt_approval_instances WHERE 1=1`;
      if (templateId && status) {
        countQuery = drizzleSql`SELECT COUNT(*) as cnt FROM grt_approval_instances WHERE template_id = ${templateId} AND status = ${status}`;
      } else if (templateId) {
        countQuery = drizzleSql`SELECT COUNT(*) as cnt FROM grt_approval_instances WHERE template_id = ${templateId}`;
      } else if (status) {
        countQuery = drizzleSql`SELECT COUNT(*) as cnt FROM grt_approval_instances WHERE status = ${status}`;
      }

      const [dataResult, countResult] = await Promise.all([
        db.execute(drizzleSql`${query} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`),
        db.execute(countQuery),
      ]);

      return {
        instances: (dataResult as any)[0] || [],
        total: Number((countResult as any)[0]?.[0]?.cnt || 0),
      };
    }),

  /**
   * 获取审批实例的步骤记录
   */
  getApprovalStepRecords: protectedProcedure
    .input(z.object({ instanceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(
        drizzleSql`SELECT * FROM grt_approval_step_records
          WHERE instance_id = ${input.instanceId}
          ORDER BY step_number ASC`
      );
      return (result as any)[0] || [];
    }),

  /**
   * 获取审批统计数据
   */
  getApprovalStats: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      const [statusStats, templateStats, avgTime] = await Promise.all([
        db.execute(drizzleSql`SELECT status, COUNT(*) as cnt FROM grt_approval_instances GROUP BY status`),
        db.execute(drizzleSql`SELECT t.template_name, COUNT(i.id) as cnt
          FROM grt_approval_templates t
          LEFT JOIN grt_approval_instances i ON i.template_id = t.id
          GROUP BY t.id, t.template_name
          ORDER BY cnt DESC LIMIT 10`),
        db.execute(drizzleSql`SELECT AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at)) / 60) as avg_minutes
          FROM grt_approval_step_records WHERE completed_at IS NOT NULL`),
      ]);

      const statusMap: Record<string, number> = {};
      for (const row of ((statusStats as any)[0] || [])) {
        statusMap[row.status] = Number(row.cnt);
      }

      return {
        statusDistribution: statusMap,
        topTemplates: ((templateStats as any)[0] || []).map((r: any) => ({
          name: r.template_name,
          count: Number(r.cnt),
        })),
        avgProcessingMinutes: Number(((avgTime as any)[0]?.[0]?.avg_minutes || 0).toFixed(1)),
        totalInstances: Object.values(statusMap).reduce((a, b) => a + b, 0),
        pendingCount: statusMap['pending'] || 0,
        approvedCount: statusMap['approved'] || 0,
        rejectedCount: statusMap['rejected'] || 0,
      };
    }),

  // ===== 知识库端点 =====

  /**
   * 获取知识文档列表
   */
  getKnowledgeDocuments: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      source: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().optional().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const category = input?.category;
      const source = input?.source;
      const search = input?.search;
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;

      // Build dynamic query
      let whereClause = '1=1';
      const conditions: string[] = [];
      if (category) conditions.push(`category = '${category.replace(/'/g, "''")}'`);
      if (source) conditions.push(`source = '${source.replace(/'/g, "''")}'`);
      if (search) conditions.push(`(title ILIKE '%${search.replace(/'/g, "''")}%' OR content ILIKE '%${search.replace(/'/g, "''")}%')`);
      if (conditions.length > 0) whereClause = conditions.join(' AND ');

      const [dataResult, countResult, statsResult] = await Promise.all([
        db.execute(drizzleSql.raw(`SELECT * FROM knowledge_documents WHERE ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`)),
        db.execute(drizzleSql.raw(`SELECT COUNT(*) as cnt FROM knowledge_documents WHERE ${whereClause}`)),
        db.execute(drizzleSql`SELECT category, COUNT(*) as cnt FROM knowledge_documents GROUP BY category`),
      ]);

      const catStats: Record<string, number> = {};
      for (const row of ((statsResult as any)[0] || [])) {
        catStats[row.category] = Number(row.cnt);
      }

      return {
        documents: ((dataResult as any)[0] || []).map((d: any) => ({
          ...d,
          tags: typeof d.tags === 'string' ? (() => { try { return JSON.parse(d.tags); } catch { return []; } })() : (d.tags || []),
        })),
        total: Number((countResult as any)[0]?.[0]?.cnt || 0),
        categoryStats: catStats,
      };
    }),

  /**
   * 导入知识库文档（从表单元数据）
   */
  importKnowledge: adminProcedure
    .mutation(async () => {
      const { getExtSyncKnowledgeImportService } = await import('../services/ext-sync-knowledge-import.service');
      const service = getExtSyncKnowledgeImportService();
      return service.importKnowledge();
    }),

  // ═══════════════════════════════════════════════════════════════
  // ai_tasks Worker-Based Import (GRT Development First Law compliant)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start full import via ai_tasks queue worker (production path)
   * Creates an ai_task, fires async worker, returns taskId for polling.
   */
  startWorkerImport: adminProcedure
    .input(z.object({
      phases: z.array(z.enum([
        "org", "user", "discovery", "project", "approval", "knowledge", "procurement", "complaint", "form_data_cache",
      ])).min(1),
      dryRun: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const { aiTasks } = await import("../../drizzle/schema");

      const [task] = await db.insert(aiTasks).values({
        taskType: "EXT_SYNC_FULL_IMPORT",
        status: "pending",
        inputData: { phases: input.phases, dryRun: input.dryRun } as Record<string, unknown>,
        createdBy: ctx.user?.name || "system",
        maxRetries: 3,
      }).returning();

      const { triggerExternalSyncWorker } = await import("../workers/externalSyncWorker");
      triggerExternalSyncWorker(task.id, {
        phases: input.phases as any[],
        dryRun: input.dryRun,
      }).catch((err) => {
        // Fire-and-forget — errors tracked in ai_tasks table
        void err;
      });

      return { taskId: task.id, status: "pending" };
    }),

  /**
   * Poll worker import status via ai_tasks
   */
  getWorkerImportStatus: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { aiTasks } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const [task] = await db.select().from(aiTasks)
        .where(eq(aiTasks.id, input.taskId)).limit(1);

      if (!task) return null;

      return {
        taskId: task.id,
        status: task.status,
        resultData: task.resultData,
        errorMessage: task.errorMessage,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        createdAt: task.createdAt,
      };
    }),

  /**
   * Preview procurement import (dry-run)
   */
  getProcurementImportPreview: adminProcedure
    .mutation(async () => {
      const { getExtSyncProcurementImportService } = await import("../services/ext-sync-procurement-import.service");
      const service = getExtSyncProcurementImportService();
      return service.importProcurement(true);
    }),

  /**
   * Preview complaint import (dry-run)
   */
  getComplaintImportPreview: adminProcedure
    .mutation(async () => {
      const { getExtSyncComplaintImportService } = await import("../services/ext-sync-complaint-import.service");
      const service = getExtSyncComplaintImportService();
      return service.importComplaints(true);
    }),
});
