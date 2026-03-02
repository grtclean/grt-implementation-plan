/**
 * 简道云集成路由
 * 提供简道云数据同步、组织架构导入、表单数据迁移等功能
 */

import { z } from "zod";
import { jsonValue } from "../../shared/validators";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getJiandaoyunSyncService, getJiandaoyunUserSyncService } from "../jiandaoyun";
import { getJiandaoyunScheduler } from "../services/jiandaoyun-scheduler.service";
import { getPermissionMappingService, GRT_ROLES, GRT_PERMISSIONS } from "../services/permission-mapping.service";
import { getJdyFullImportService, type ImportPhase } from "../services/jdy-full-import.service";
import { getJdyFormDiscoveryService } from "../services/jdy-form-discovery.service";
import { requireDb } from "../db";
import { sql as drizzleSql } from "drizzle-orm";

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
      permissionMapping: z.record(z.string(), jsonValue).optional(),
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
      filterCondition: z.record(z.string(), jsonValue).optional(),
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

  // ===== 全量导入功能 =====

  /**
   * 启动全量导入
   */
  startFullImport: adminProcedure
    .input(z.object({
      phases: z.array(z.enum(['org', 'user', 'discovery', 'project', 'approval', 'knowledge'])).min(1),
      dryRun: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const service = getJdyFullImportService();
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
      const service = getJdyFullImportService();
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
      const service = getJdyFullImportService();
      return service.getImportRuns();
    }),

  /**
   * 取消导入
   */
  cancelImport: adminProcedure
    .mutation(async () => {
      const service = getJdyFullImportService();
      const cancelled = service.requestCancel();
      return { cancelled };
    }),

  /**
   * 检查是否有正在运行的导入
   */
  isImportRunning: protectedProcedure
    .query(async () => {
      const service = getJdyFullImportService();
      return { running: service.isRunning() };
    }),

  /**
   * 执行表单发现
   */
  discoverForms: adminProcedure
    .mutation(async () => {
      const service = getJdyFormDiscoveryService();
      return service.discoverForms();
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
      const service = getJdyFormDiscoveryService();
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
      const service = getJdyFormDiscoveryService();
      const { id, ...updates } = input;
      return service.updateFormMapping(id, updates);
    }),

  /**
   * 获取导入验证结果
   */
  getImportVerification: protectedProcedure
    .query(async () => {
      const service = getJdyFullImportService();
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
      const { getJdyKnowledgeImportService } = await import('../services/jdy-knowledge-import.service');
      const service = getJdyKnowledgeImportService();
      return service.importKnowledge();
    }),
});
