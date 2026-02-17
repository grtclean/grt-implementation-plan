/**
 * 简道云集成路由
 * 提供简道云数据同步、组织架构导入、表单数据迁移等功能
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getJiandaoyunSyncService, getJiandaoyunUserSyncService } from "../jiandaoyun";
import { getJiandaoyunScheduler } from "../services/jiandaoyun-scheduler.service";
import { getPermissionMappingService, GRT_ROLES, GRT_PERMISSIONS } from "../services/permission-mapping.service";

export const jiandaoyunRouter = router({
  /**
   * 获取配置状态
   */
  getStatus: protectedProcedure.query(async () => {
    const service = getJiandaoyunSyncService();
    return {
      configured: service.isConfigured(),
      corpId: service.getCorpId(),
      stats: service.getStats(),
    };
  }),

  /**
   * 测试API连接
   */
  testConnection: protectedProcedure.mutation(async () => {
    const service = getJiandaoyunSyncService();
    return service.testConnection();
  }),

  /**
   * 获取应用列表
   */
  getApps: protectedProcedure.query(async () => {
    const service = getJiandaoyunSyncService();
    if (!service.isConfigured()) {
      return { apps: [], error: "简道云API未配置" };
    }
    try {
      const apps = await service.syncApps();
      return { apps, error: null };
    } catch (error: any) {
      return { apps: [], error: error.message };
    }
  }),

  /**
   * 获取指定应用的表单列表
   */
  getForms: protectedProcedure
    .input(z.object({ appId: z.string() }))
    .query(async ({ input }) => {
      const service = getJiandaoyunSyncService();
      if (!service.isConfigured()) {
        return { forms: [], error: "简道云API未配置" };
      }
      try {
        const forms = await service.syncForms(input.appId);
        return { forms, error: null };
      } catch (error: any) {
        return { forms: [], error: error.message };
      }
    }),

  /**
   * 获取表单字段结构
   */
  getFormFields: protectedProcedure
    .input(z.object({ appId: z.string(), formId: z.string() }))
    .query(async ({ input }) => {
      const service = getJiandaoyunSyncService();
      if (!service.isConfigured()) {
        return { fields: [], error: "简道云API未配置" };
      }
      try {
        const fields = await service.getFormFields(input.appId, input.formId);
        return { fields, error: null };
      } catch (error: any) {
        return { fields: [], error: error.message };
      }
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
      const service = getJiandaoyunSyncService();
      if (!service.isConfigured()) {
        return { data: [], error: "简道云API未配置" };
      }
      try {
        const result = await service.getFormData(input.appId, input.formId, {
          limit: input.limit,
          dataId: input.dataId,
        });
        return { data: result.data, error: null };
      } catch (error: any) {
        return { data: [], error: error.message };
      }
    }),

  /**
   * 获取表单数据统计
   */
  getFormStats: protectedProcedure
    .input(z.object({ appId: z.string(), formId: z.string() }))
    .query(async ({ input }) => {
      const service = getJiandaoyunSyncService();
      if (!service.isConfigured()) {
        return { count: 0, error: "简道云API未配置" };
      }
      try {
        const stats = await service.getFormStats(input.appId, input.formId);
        return { count: stats.count, error: null };
      } catch (error: any) {
        return { count: 0, error: error.message };
      }
    }),

  /**
   * 获取部门列表
   */
  getDepartments: protectedProcedure
    .input(z.object({ deptNo: z.number().optional().default(1) }))
    .query(async ({ input }) => {
      const service = getJiandaoyunSyncService();
      if (!service.isConfigured()) {
        return { departments: [], error: "简道云API未配置" };
      }
      try {
        const departments = await service.getDepartments(input.deptNo);
        return { departments, error: null };
      } catch (error: any) {
        return { departments: [], error: error.message };
      }
    }),

  /**
   * 获取成员列表
   */
  getMembers: protectedProcedure
    .input(z.object({ deptNo: z.number().optional().default(1) }))
    .query(async ({ input }) => {
      const service = getJiandaoyunSyncService();
      if (!service.isConfigured()) {
        return { members: [], error: "简道云API未配置" };
      }
      try {
        const members = await service.getMembers(input.deptNo);
        return { members, error: null };
      } catch (error: any) {
        return { members: [], error: error.message };
      }
    }),

  /**
   * 获取角色列表
   */
  getRoles: protectedProcedure.query(async () => {
    const service = getJiandaoyunSyncService();
    if (!service.isConfigured()) {
      return { roles: [], error: "简道云API未配置" };
    }
    try {
      const roles = await service.getRoles();
      return { roles, error: null };
    } catch (error: any) {
      return { roles: [], error: error.message };
    }
  }),

  /**
   * 执行全量同步
   */
  fullSync: adminProcedure.mutation(async () => {
    const service = getJiandaoyunSyncService();
    if (!service.isConfigured()) {
      return { success: false, error: "简道云API未配置" };
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
   * 同步简道云成员到用户映射表
   */
  syncMembers: adminProcedure.mutation(async () => {
    const userSyncService = getJiandaoyunUserSyncService();
    try {
      const result = await userSyncService.syncMembers();
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }),

  /**
   * 同步简道云部门到部门映射表
   */
  syncDepartments: adminProcedure.mutation(async () => {
    const userSyncService = getJiandaoyunUserSyncService();
    try {
      const result = await userSyncService.syncDepartments();
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }),

  /**
   * 同步简道云角色到角色映射表
   */
  syncRoles: adminProcedure.mutation(async () => {
    const userSyncService = getJiandaoyunUserSyncService();
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
    const userSyncService = getJiandaoyunUserSyncService();
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
    const userSyncService = getJiandaoyunUserSyncService();
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
    const userSyncService = getJiandaoyunUserSyncService();
    try {
      const mappings = await userSyncService.getRoleMappings();
      return { mappings, error: null };
    } catch (error: any) {
      return { mappings: [], error: error.message };
    }
  }),

  /**
   * 关联简道云用户与GRT用户
   */
  linkUserToGrt: adminProcedure
    .input(z.object({
      jdyUsername: z.string(),
      grtUserId: z.number(),
      grtOpenId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const userSyncService = getJiandaoyunUserSyncService();
      try {
        const success = await userSyncService.linkUserToGrt(
          input.jdyUsername,
          input.grtUserId,
          input.grtOpenId
        );
        return { success };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),

  /**
   * 关联简道云角色与GRT权限角色
   */
  linkRoleToGrt: adminProcedure
    .input(z.object({
      jdyRoleNo: z.number(),
      grtRoleId: z.string(),
      grtRoleName: z.string(),
      permissionMapping: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const userSyncService = getJiandaoyunUserSyncService();
      try {
        const success = await userSyncService.linkRoleToGrt(
          input.jdyRoleNo,
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
   * 同步简道云角色成员
   */
  syncRoleMembers: adminProcedure.mutation(async () => {
    const userSyncService = getJiandaoyunUserSyncService();
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
      const userSyncService = getJiandaoyunUserSyncService();
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
      const service = getJiandaoyunSyncService();
      if (!service.isConfigured()) {
        return { members: [], error: "简道云API未配置" };
      }
      try {
        const members = await service.getRoleMembers(input.roleNo);
        return { members, error: null };
      } catch (error: any) {
        return { members: [], error: error.message };
      }
    }),

  // ===== 定时同步任务路由 =====

  /**
   * 获取所有同步任务
   */
  getSyncTasks: protectedProcedure.query(async () => {
    const scheduler = getJiandaoyunScheduler();
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
      jdyAppId: z.string().optional(),
      jdyFormId: z.string().optional(),
      syncDirection: z.enum(['jdy_to_grt', 'grt_to_jdy', 'bidirectional']),
      fieldMapping: z.record(z.string(), z.string()).optional(),
      filterCondition: z.record(z.string(), z.any()).optional(),
      cronExpression: z.string().optional(),
      isEnabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const scheduler = getJiandaoyunScheduler();
      try {
        const taskId = await scheduler.createTask(input);
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
      const scheduler = getJiandaoyunScheduler();
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
      const scheduler = getJiandaoyunScheduler();
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
      const scheduler = getJiandaoyunScheduler();
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
      const scheduler = getJiandaoyunScheduler();
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
    const scheduler = getJiandaoyunScheduler();
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
    const scheduler = getJiandaoyunScheduler();
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
   * 自动映射简道云角色到GRT角色
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
    .input(z.object({ jdyRoleName: z.string() }))
    .query(async ({ input }) => {
      const permissionService = getPermissionMappingService();
      const suggestedRoleId = permissionService.suggestGrtRole(input.jdyRoleName);
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
    const service = getJiandaoyunSyncService();
    if (!service.isConfigured()) {
      return { 
        buMembers: [],
        error: "简道云API未配置"
      };
    }
    try {
      // 获取所有部门
      const departments = await service.getDepartments();
      // 获取所有成员
      const allMembers = await service.getMembers();
      
      // 定义BU事业部关键词映射
      const buKeywords: Record<string, string[]> = {
        'BU1': ['海外', 'overseas', 'international'],
        'BU2': ['商用车', '商用', 'commercial'],
        'BU3': ['乘用车', '乘用', 'passenger'],
        'BU4': ['半导体', 'semiconductor', '芯片'],
        'BU5': ['工业通用', '通用', 'general', 'industrial'],
      };
      
      // 根据部门名称匹配BU
      const buMembers: Array<{
        buCode: string;
        buName: string;
        departments: Array<{
          deptNo: number;
          deptName: string;
          members: Array<{
            username: string;
            name: string;
            status: number;
            email?: string;
            phone?: string;
          }>;
        }>;
        totalMembers: number;
      }> = [];
      
      // 初始化BU结构
      const buNames: Record<string, string> = {
        'BU1': 'BU1 - 海外事业部',
        'BU2': 'BU2 - 商用车事业部',
        'BU3': 'BU3 - 乘用车事业部',
        'BU4': 'BU4 - 半导体事业部',
        'BU5': 'BU5 - 工业通用事业部',
      };
      
      for (const [buCode, keywords] of Object.entries(buKeywords)) {
        const matchedDepts = departments.filter(dept => 
          keywords.some(kw => dept.name.toLowerCase().includes(kw.toLowerCase()))
        );
        
        const deptData = matchedDepts.map(dept => {
          const deptMembers = allMembers.filter(m => 
            m.departments?.includes(dept.dept_no)
          );
          return {
            deptNo: dept.dept_no,
            deptName: dept.name,
            members: deptMembers.map(m => ({
              username: m.username,
              name: m.name,
              status: m.status,
              email: (m as any).email,
              phone: (m as any).phone,
            })),
          };
        });
        
        const totalMembers = deptData.reduce((sum, d) => sum + d.members.length, 0);
        
        buMembers.push({
          buCode,
          buName: buNames[buCode] || buCode,
          departments: deptData,
          totalMembers,
        });
      }
      
      return { buMembers, error: null };
    } catch (error: any) {
      return { buMembers: [], error: error.message };
    }
  }),
});
